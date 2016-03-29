package org.pujun.interp;

import static java.lang.Math.log;
import static java.lang.Math.pow;

/**
 * Created by milletpu on 16/3/16.
 */

public class RBF_thinplate implements RBF_fn {

    public double rbf(final double r) {
        return r <= 0. ? 0. : pow(r,2) * log(r+1);
    }
}